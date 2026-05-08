"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOptions, type ApiOption } from "@/lib/api/options";
import { toast } from "sonner";

export interface PetWeightRule {
  minWeight: number;
  maxWeight: number;
  petTypeId: string; // Always string in form
}

interface PetWeightRulesFormProps {
  rules: PetWeightRule[];
  onChange: (rules: PetWeightRule[]) => void;
}

export function PetWeightRulesForm({
  rules,
  onChange,
}: PetWeightRulesFormProps) {
  const [petTypes, setPetTypes] = useState<ApiOption[]>([]);
  const [isLoadingPetTypes, setIsLoadingPetTypes] = useState(true);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Fetch pet types on mount
  useEffect(() => {
    const fetchPetTypes = async () => {
      try {
        setIsLoadingPetTypes(true);
        const data = await getOptions("pet type");
        setPetTypes(data.options ?? []);
      } catch (err) {
        toast.error("Gagal memuat tipe hewan");
      } finally {
        setIsLoadingPetTypes(false);
      }
    };
    fetchPetTypes();
  }, []);

  const handleAddRow = () => {
    const newRule: PetWeightRule = {
      minWeight: 0,
      maxWeight: 1,
      petTypeId: "",
    };
    onChange([...rules, newRule]);
  };

  const handleDeleteRow = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
    // Clear error for deleted row
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  const handleRuleChange = (
    index: number,
    field: keyof PetWeightRule,
    value: any,
  ) => {
    const updatedRules = [...rules];
    updatedRules[index] = {
      ...updatedRules[index],
      [field]: value,
    };

    // Validate
    const rule = updatedRules[index];
    if (
      rule.petTypeId &&
      rule.minWeight !== undefined &&
      rule.maxWeight !== undefined
    ) {
      if (rule.minWeight >= rule.maxWeight) {
        setErrors((prev) => ({
          ...prev,
          [index]: "Min weight harus lebih kecil dari max weight",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[index];
          return newErrors;
        });
      }
    }

    onChange(updatedRules);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label className="block text-sm font-medium mb-2">
          Aturan Berat Badan & Tipe Hewan
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Tentukan range berat badan untuk setiap tipe hewan pada ukuran ini.
          Contoh: Kucing 0-2kg, Anjing 0-3kg.
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <p className="text-sm text-muted-foreground mb-3">
            Belum ada aturan berat badan
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
          >
            <Plus className="h-3 w-3 mr-1" />
            Tambah Aturan Pertama
          </Button>
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="space-y-3 p-4">
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 pb-4 border-b last:border-b-0"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Pet Type */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Tipe Hewan
                      </label>
                      <Select
                        value={rule.petTypeId}
                        onValueChange={(value) =>
                          handleRuleChange(index, "petTypeId", value)
                        }
                        disabled={isLoadingPetTypes}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Pilih tipe hewan" />
                        </SelectTrigger>
                        <SelectContent>
                          {petTypes.map((type) => (
                            <SelectItem key={type._id} value={type._id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Min Weight */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Min Weight (kg)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={rule.minWeight ?? ""}
                        onChange={(e) =>
                          handleRuleChange(
                            index,
                            "minWeight",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="text-sm"
                        step="0.1"
                        min="0"
                      />
                    </div>

                    {/* Max Weight */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Max Weight (kg)
                      </label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={rule.maxWeight ?? ""}
                        onChange={(e) =>
                          handleRuleChange(
                            index,
                            "maxWeight",
                            parseFloat(e.target.value) || 1,
                          )
                        }
                        className="text-sm"
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Error message */}
                  {errors[index] && (
                    <p className="text-xs text-destructive">{errors[index]}</p>
                  )}

                  {/* Delete button */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRow(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rules.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          className="w-full"
        >
          <Plus className="h-3 w-3 mr-1" />
          Tambah Aturan
        </Button>
      )}
    </div>
  );
}
